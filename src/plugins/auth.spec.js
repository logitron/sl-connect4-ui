import { createLocalVue } from '@vue/test-utils'
import Auth from './auth'
import axios from 'axios'
import moxios from 'moxios'
import store from '@/store'
import router from '@/router'
import types from '@/store/modules/user/mutations/types'

describe('Plugin: Auth', () => {
  let localVue = createLocalVue()
  let sandbox

  before(() => {
    moxios.install()
    localVue.use(Auth)

    sandbox = sinon.createSandbox({})

    moxios.stubRequest('/noToken', { status: 200 })
    moxios.stubRequest('/token', { status: 200 })
    moxios.stubRequest('/invalidToken', { status: 401 })
    moxios.stubRequest('/otherError', { status: 500 })
  })

  after(() => {
    moxios.uninstall()
  })

  context('when api is called with no token', () => {
    let request

    before((done) => {
      sandbox.stub(store, 'state').value({
        user: {}
      })

      axios.get('/noToken')

      moxios.wait(() => {
        request = moxios.requests.mostRecent()
        done()
      })
    })

    after(() => sandbox.restore())

    it('does not set authorization header on request', () => {
      expect(request.headers.hasOwnProperty('Authorization')).to.be.false
    })
  })

  context('when api is called with token', () => {
    let request
    let authToken = 'wubalubadubdub'

    before((done) => {
      sandbox.stub(store, 'state').value({
        user: {
          accessToken: authToken
        }
      })

      axios.get('/token')

      moxios.wait(() => {
        request = moxios.requests.mostRecent()
        done()
      })
    })

    after(() => sandbox.restore())

    it('sets authorization header on request', () => {
      expect(request.headers.Authorization).to.equal(authToken)
    })
  })

  context('when server responds with unauthorized status', () => {
    let routerPushStub

    before((done) => {
      sandbox.stub(store, 'state').value({
        user: {
          accessToken: 'wubalubadubdub'
        }
      })

      routerPushStub = sandbox.stub(router, 'push')

      sandbox.spy(store, 'commit')

      axios.get('/invalidToken').catch((response) => {
        done()
      })
    })

    after(() => sandbox.restore())

    it('clears the access token', () => {
      expect(store.commit).to.have.been.calledWith(`user/${types.CLEAR_ACCESS_TOKEN}`)
    })

    it('clears the current user', () => {
      expect(store.commit).to.have.been.calledWith(`user/${types.CLEAR_CURRENT_USER}`)
    })

    it('routes user to home page', () => {
      expect(routerPushStub).to.have.been.calledWith({ name: 'Home' })
    })
  })

  context('when server responds with alternative error status', () => {
    let routerPushStub

    before((done) => {
      sandbox.stub(store, 'state').value({
        user: {
          accessToken: 'wubalubadubdub'
        }
      })

      routerPushStub = sandbox.stub(router, 'push')

      sandbox.spy(store, 'commit')

      axios.get('/otherError').catch((response) => {
        done()
      })
    })

    after(() => sandbox.restore())

    it('does not reroute user', () => {
      expect(routerPushStub).not.to.have.been.called
    })

    it('does not commit anything', () => {
      expect(store.commit).not.to.have.been.called
    })
  })
})
